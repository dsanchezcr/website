using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using System.Text.Json;

namespace api;

public class SendEmail
{
    private readonly ILogger<SendEmail> _logger;
    private static readonly EmailClient _emailClient = new(Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING"));

    // Input model for request validation
    private record ContactRequest(string Name, string Email, string Message);

    public SendEmail(ILogger<SendEmail> logger)
    {
        _logger = logger;
    }

    [Function("SendEmailFunction")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "contact")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        using var activity = _logger.BeginScope("SendEmail Function");
        _logger.LogInformation("SendEmail Function Triggered");

        try
        {
            // Parse request body
            var contactRequest = await ParseRequestAsync(req, cancellationToken);
            if (contactRequest == null)
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid request. Please provide name, email, and message in JSON format.");
            }

            // Validate email format
            if (!IsValidEmail(contactRequest.Email))
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid email format.");
            }

            // Send emails concurrently for better performance
            var tasks = new[]
            {
                SendNotificationEmailAsync(contactRequest, cancellationToken),
                SendConfirmationEmailAsync(contactRequest, cancellationToken)
            };

            var results = await Task.WhenAll(tasks);
            
            if (results.All(r => r.HasCompleted))
            {
                _logger.LogInformation("Both emails sent successfully for {Email}", contactRequest.Email);
                return await CreateSuccessResponseAsync(req, "Emails sent successfully.");
            }
            else
            {
                _logger.LogWarning("Some emails failed to send for {Email}", contactRequest.Email);
                return await CreateErrorResponseAsync(req, HttpStatusCode.PartialContent, 
                    "Some emails could not be sent. Please try again.");
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("SendEmail operation was cancelled");
            return await CreateErrorResponseAsync(req, HttpStatusCode.RequestTimeout, 
                "Request timeout. Please try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in SendEmail function");
            return await CreateErrorResponseAsync(req, HttpStatusCode.InternalServerError, 
                "An unexpected error occurred. Please try again later.");
        }
    }

    private async Task<ContactRequest?> ParseRequestAsync(HttpRequestData req, CancellationToken cancellationToken)
    {
        try
        {
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync(cancellationToken);
            
            if (string.IsNullOrWhiteSpace(requestBody))
                return null;

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var data = JsonSerializer.Deserialize<ContactRequest>(requestBody, options);
            
            // Validate required fields
            if (string.IsNullOrWhiteSpace(data?.Name) || 
                string.IsNullOrWhiteSpace(data?.Email) || 
                string.IsNullOrWhiteSpace(data?.Message))
            {
                return null;
            }

            return data;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse JSON request body");
            return null;
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private async Task<EmailSendOperation> SendNotificationEmailAsync(ContactRequest contact, CancellationToken cancellationToken)
    {
        try
        {
            var operation = await _emailClient.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: "david@dsanchezcr.com",
                subject: $"New website message from {contact.Name}",
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>New Contact Form Submission</h2>
                            <p><strong>Name:</strong> {System.Net.WebUtility.HtmlEncode(contact.Name)}</p>
                            <p><strong>Email:</strong> {System.Net.WebUtility.HtmlEncode(contact.Email)}</p>
                            <p><strong>Message:</strong></p>
                            <div style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #007acc;">
                                {System.Net.WebUtility.HtmlEncode(contact.Message)}
                            </div>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Notification email sent with ID: {MessageId}, Status: {Status}", 
                operation.Id, operation.Value.Status);
            
            return operation;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "Failed to send notification email. Error: {ErrorCode}", ex.ErrorCode);
            throw;
        }
    }

    private async Task<EmailSendOperation> SendConfirmationEmailAsync(ContactRequest contact, CancellationToken cancellationToken)
    {
        try
        {
            var operation = await _emailClient.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: contact.Email,
                subject: "Thank you for contacting David Sanchez",
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>Thank you for reaching out!</h2>
                            <p>Hello {System.Net.WebUtility.HtmlEncode(contact.Name)},</p>
                            <p>Thank you very much for your message. I will try to get back to you as soon as possible.</p>
                            <p>Best regards,<br/>David Sanchez</p>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Confirmation email sent with ID: {MessageId}, Status: {Status}", 
                operation.Id, operation.Value.Status);
            
            return operation;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}. Error: {ErrorCode}", 
                contact.Email, ex.ErrorCode);
            throw;
        }
    }

    private static async Task<HttpResponseData> CreateSuccessResponseAsync(HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { success = true, message }));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { success = false, error = message }));
        return response;
    }

    [Function("HealthCheck")]
    public static HttpResponseData Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString(JsonSerializer.Serialize(new 
        { 
            status = "healthy", 
            timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            version = "1.0.0"
        }));
        return response;
    }
}