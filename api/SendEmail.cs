using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Communication.Email;
using Azure;
using System;

namespace api
{
    public static class SendEmail
    {
        [FunctionName("SendEmailFunction")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("SendEmail Function Triggered.");
            string name = req.Query["name"];
            string email = req.Query["email"];
            string message = req.Query["message"];
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            name ??= data?.name;
            email ??= data?.email;
            message ??= data?.message;
            var emailClient = new EmailClient(Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING"));
            try
            {
                //Email to notify myself
                var selfEmailSendOperation = await emailClient.SendAsync(
                    wait: WaitUntil.Completed,
                    senderAddress: "DoNotReply@dsanchezcr.com",
                    recipientAddress: "david@dsanchezcr.com",            
                    subject: $"New message in the website from {name} ({email})",
                    htmlContent: "<html><body>" + name + " with email address " + email + " sent the following message: <br />" + message + "</body></html>");
                log.LogInformation($"Email sent with message ID: {selfEmailSendOperation.Id} and status: {selfEmailSendOperation.Value.Status}");
                //Email to notify the contact
                var contactEmailSendOperation = await emailClient.SendAsync(
                    wait: WaitUntil.Completed,
                    senderAddress: "DoNotReply@dsanchezcr.com",
                    recipientAddress: email,
                    subject: $"Email sent to David Sanchez. Thank you for reaching out.",
                    htmlContent: "Hello " + name + " thank you very much for your message. I will try to get back you as soon as possible.");
                log.LogInformation($"Email sent with message ID: {contactEmailSendOperation.Id} and status: {contactEmailSendOperation.Value.Status}");
                return new OkObjectResult($"Emails sent.");
            }
            catch (RequestFailedException ex)
            {
                log.LogError($"Email send operation failed with error code: {ex.ErrorCode}, message: {ex.Message}");
                return new ConflictObjectResult("Error sending email");
            }            
        }
    }
}