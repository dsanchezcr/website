using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using System.Text.Json;

namespace api
{
    public class SendEmail
    {
        private readonly ILogger _logger;

        public SendEmail(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<SendEmail>();
        }

        [Function("SendEmailFunction")]
        public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req)
        {
            _logger.LogInformation("SendEmail Function Triggered.");

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            
            string? name = null;
            string? email = null;
            string? message = null;

            // Try to parse JSON if request body is not empty
            if (!string.IsNullOrEmpty(requestBody))
            {
                try
                {
                    var data = JsonSerializer.Deserialize<JsonElement>(requestBody);
                    if (data.TryGetProperty("name", out var nameProperty))
                        name = nameProperty.GetString();
                    if (data.TryGetProperty("email", out var emailProperty))
                        email = emailProperty.GetString();
                    if (data.TryGetProperty("message", out var messageProperty))
                        message = messageProperty.GetString();
                }
                catch (JsonException)
                {
                    _logger.LogWarning("Failed to parse JSON request body");
                }
            }

            // Fall back to query parameters if not found in body
            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            name ??= query["name"];
            email ??= query["email"];
            message ??= query["message"];

            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(message))
            {
                var response = req.CreateResponse(HttpStatusCode.BadRequest);
                await response.WriteStringAsync("Please provide name, email, and message.");
                return response;
            }

            var emailClient = new EmailClient(Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING"));
            try
            {
                var selfEmailSendOperation = await emailClient.SendAsync(
                    wait: WaitUntil.Completed,
                    senderAddress: "DoNotReply@dsanchezcr.com",
                    recipientAddress: "david@dsanchezcr.com",
                    subject: $"New message in the website from {name} ({email})",
                    htmlContent: $"<html><body>{name} with email address {email} sent the following message: <br />{message}</body></html>");
                _logger.LogInformation($"Email sent with message ID: {selfEmailSendOperation.Id} and status: {selfEmailSendOperation.Value.Status}");

                var contactEmailSendOperation = await emailClient.SendAsync(
                    wait: WaitUntil.Completed,
                    senderAddress: "DoNotReply@dsanchezcr.com",
                    recipientAddress: email,
                    subject: "Email sent to David Sanchez. Thank you for reaching out.",
                    htmlContent: $"Hello {name}, thank you very much for your message. I will try to get back to you as soon as possible.");
                _logger.LogInformation($"Email sent with message ID: {contactEmailSendOperation.Id} and status: {contactEmailSendOperation.Value.Status}");

                var okResponse = req.CreateResponse(HttpStatusCode.OK);
                await okResponse.WriteStringAsync("Emails sent.");
                return okResponse;
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError($"Email send operation failed with error code: {ex.ErrorCode}, message: {ex.Message}");
                var errorResponse = req.CreateResponse(HttpStatusCode.Conflict);
                await errorResponse.WriteStringAsync("Error sending email");
                return errorResponse;
            }
        }
    }
}