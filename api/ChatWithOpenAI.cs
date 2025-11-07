using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.AI.OpenAI;
using System.Collections.Generic;
using Azure;
using OpenAI.Chat;

namespace api
{
    public class ChatWithOpenAI
    {
        private readonly ILogger _logger;
        private readonly ChatClient _chatClient;
        private readonly string _systemPrompt;
        
        public ChatWithOpenAI(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<ChatWithOpenAI>();
            // Use environment variables for configuration
            string? endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
            string? key = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY");
            string? deploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT");
            _systemPrompt = Environment.GetEnvironmentVariable("AZURE_OPENAI_SYSTEM_PROMPT") ?? "You are an online assistant for the website https://dsanchezcr.com answer only questions relevant to the content of the website.";
            
            if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(key) || string.IsNullOrEmpty(deploymentName))
            {
                throw new InvalidOperationException("Azure OpenAI configuration is missing. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT environment variables.");
            }
            
            AzureOpenAIClient azureClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(key));
            _chatClient = azureClient.GetChatClient(deploymentName);
        }

        [Function("ChatWithOpenAI")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "nlweb/ask")] HttpRequestData req)
        {
            _logger.LogInformation("ChatWithOpenAI Function Triggered.");

            // Handle CORS preflight request
            if (req.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                var corsResponse = req.CreateResponse(HttpStatusCode.OK);
                corsResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                corsResponse.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
                corsResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                corsResponse.Headers.Add("Access-Control-Max-Age", "86400");
                return corsResponse;
            }

            try
            {
                using var reader = new StreamReader(req.Body);
                var body = await reader.ReadToEndAsync();
                var chatRequest = JsonSerializer.Deserialize<ChatRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (chatRequest == null || string.IsNullOrWhiteSpace(chatRequest.Query))
                {
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    badRequest.Headers.Add("Access-Control-Allow-Origin", "*");
                    await badRequest.WriteStringAsync("Missing or invalid 'query' in request body.");
                    return badRequest;
                }

                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(_systemPrompt)
                };
                
                if (!string.IsNullOrWhiteSpace(chatRequest.Prev))
                {
                    messages.Add(new UserChatMessage(chatRequest.Prev));
                }
                messages.Add(new UserChatMessage(chatRequest.Query));

                var options = new ChatCompletionOptions
                {
                    MaxOutputTokenCount = 1024,
                    Temperature = 0.7f
                };

                var completion = await _chatClient.CompleteChatAsync(messages, options);
                var result = completion.Value.Content[0].Text;

                var responseObj = new
                {
                    query_id = Guid.NewGuid().ToString(),
                    result = result
                };
                var ok = req.CreateResponse(HttpStatusCode.OK);
                ok.Headers.Add("Content-Type", "application/json");
                ok.Headers.Add("Access-Control-Allow-Origin", "*");
                ok.Headers.Add("Cache-Control", "public, max-age=30");
                await ok.WriteStringAsync(JsonSerializer.Serialize(responseObj));
                return ok;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ChatWithOpenAI");
                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                error.Headers.Add("Content-Type", "application/json");
                error.Headers.Add("Access-Control-Allow-Origin", "*");
                var errorObj = new {
                    error = $"Error: {ex.Message}"
                };
                await error.WriteStringAsync(JsonSerializer.Serialize(errorObj));
                return error;
            }
        }

        public class ChatRequest
        {
            public string Query { get; set; } = string.Empty;
            public string? Prev { get; set; } // Optional: previous context
        }
    }
}