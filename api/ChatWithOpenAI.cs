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
        private readonly ILogger<ChatWithOpenAI> _logger;
        private readonly ChatClient _chatClient;
        private readonly string _systemPrompt;
        private const int MaxQueryLength = 2000;
        private const int MaxPrevLength = 4000;
        
        public ChatWithOpenAI(ILogger<ChatWithOpenAI> logger)
        {
            _logger = logger;
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
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "nlweb/ask")] HttpRequestData req)
        {
            _logger.LogInformation("ChatWithOpenAI Function Triggered.");

            // Note: CORS preflight (OPTIONS) is automatically handled by Azure Static Web Apps platform

            try
            {
                using var reader = new StreamReader(req.Body);
                var body = await reader.ReadToEndAsync();
                var chatRequest = JsonSerializer.Deserialize<ChatRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (chatRequest == null || string.IsNullOrWhiteSpace(chatRequest.Query))
                {
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteStringAsync("Missing or invalid 'query' in request body.");
                    return badRequest;
                }

                // Validate query length to prevent abuse
                if (chatRequest.Query.Length > MaxQueryLength)
                {
                    _logger.LogWarning("Query too long: {Length} characters", chatRequest.Query.Length);
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteStringAsync($"Query is too long. Maximum length is {MaxQueryLength} characters.");
                    return badRequest;
                }

                // Validate previous context length
                if (!string.IsNullOrWhiteSpace(chatRequest.Prev) && chatRequest.Prev.Length > MaxPrevLength)
                {
                    _logger.LogWarning("Previous context too long: {Length} characters", chatRequest.Prev.Length);
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteStringAsync($"Previous context is too long. Maximum length is {MaxPrevLength} characters.");
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
                ok.Headers.Add("Cache-Control", "private, no-store");
                await ok.WriteStringAsync(JsonSerializer.Serialize(responseObj));
                return ok;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ChatWithOpenAI");
                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                error.Headers.Add("Content-Type", "application/json");
                var errorObj = new {
                    error = "An error occurred processing your request. Please try again later."
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