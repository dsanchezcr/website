using System.Net;
using Azure;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Microsoft.Extensions.Configuration;

namespace api
{
    public class SendEmailFunction
    {
        private readonly IConfiguration? _config;

        private class Data
        {
            public string name { get; set; }
            public string email { get; set; }
            public string message { get; set; }
        }

        [Function("SendEmailFunction")]
        public async Task<HttpResponseData> RunAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var data = JsonSerializer.Deserialize<Data>(requestBody);
            string fromEmailAddress = "<your from email address>";
            string toEmailAddress = "<your to email address>";
            var emailClient = new EmailClient(connectionString: _config.GetConnectionString("AzureCommunicationStringConnection"));
            var sendEmailResult = await emailClient.SendAsync(
                WaitUntil.Started,                
                fromEmailAddress,
                toEmailAddress,
                subject: $"New message in the website from {data.name} ({data.email})",
                data.message);
            return response;
        }
    }
}