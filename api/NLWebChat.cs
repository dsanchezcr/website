using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace api;

public class NLWebChat
{
    private readonly ILogger<NLWebChat> _logger;

    // Input model for chat request validation
    private record ChatRequest(string Message);
    
    // Output model for chat response
    private record ChatResponse(string Response, string Timestamp, string Status);

    public NLWebChat(ILogger<NLWebChat> logger)
    {
        _logger = logger;
    }

    [Function("NLWebChat")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        using var activity = _logger.BeginScope("NLWebChat Function");
        _logger.LogInformation("NLWebChat Function Triggered");

        try
        {
            // Parse request body
            var chatRequest = await ParseRequestAsync(req, cancellationToken);
            if (chatRequest == null)
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Message cannot be empty");
            }

            // Simulate processing delay (like the Python version)
            await Task.Delay(1000, cancellationToken);

            // Generate response based on message content
            var responseText = GenerateResponse(chatRequest.Message);

            // Create successful response
            var response = new ChatResponse(
                Response: responseText,
                Timestamp: DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Status: "success"
            );

            _logger.LogInformation("Chat response generated for message: {Message}", chatRequest.Message);
            return await CreateSuccessResponseAsync(req, response);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("NLWebChat operation was cancelled");
            return await CreateErrorResponseAsync(req, HttpStatusCode.RequestTimeout, 
                "Request timeout. Please try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in NLWebChat function");
            return await CreateErrorResponseAsync(req, HttpStatusCode.InternalServerError, 
                "Internal server error");
        }
    }

    private async Task<ChatRequest?> ParseRequestAsync(HttpRequestData req, CancellationToken cancellationToken)
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

            var data = JsonSerializer.Deserialize<ChatRequest>(requestBody, options);
            
            // Validate message field
            if (string.IsNullOrWhiteSpace(data?.Message))
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

    private string GenerateResponse(string message)
    {
        var messageLower = message.ToLowerInvariant();
        
        // Simple keyword-based responses for demonstration (matching Python logic)
        if (ContainsAny(messageLower, "azure", "cloud", "microsoft"))
        {
            return "David has extensive experience with Azure and Microsoft technologies. He works as a Global Black Belt for Azure Developer Productivity at Microsoft. You can find many of his blog posts about Azure Cosmos DB, Azure OpenAI, Azure Cognitive Search, and other Azure services on his blog. He's particularly passionate about helping developers be more productive with Azure tools and services.";
        }
        
        if (ContainsAny(messageLower, "blog", "posts", "articles", "writing"))
        {
            return "David loves writing and sharing about technology. His blog covers topics like Azure services, developer productivity, cloud development environments, and modern software development practices. Some of his popular posts include topics on Azure Cosmos DB with Azure OpenAI, GitHub Codespaces vs Microsoft DevBox, and various Azure integrations. You can explore all his posts in the blog section.";
        }
        
        if (ContainsAny(messageLower, "projects", "github", "open source"))
        {
            return "All of David's projects are open source and available on GitHub. He's contributed to various projects related to Azure, developer tools, and web technologies. You can check out his projects section to see his latest work, including this website itself which is built with Docusaurus and deployed on Azure Static Web Apps.";
        }
        
        if (ContainsAny(messageLower, "speaking", "presentations", "talks", "sessions"))
        {
            return "David is an active speaker in the tech community. You can find his speaking sessions and presentations on Sessionize. He often talks about Azure services, developer productivity, cloud development, and modern software development practices. His sessions cover both technical deep-dives and practical guidance for developers.";
        }
        
        if (ContainsAny(messageLower, "about", "career", "background", "experience"))
        {
            return "David Sanchez is a Global Black Belt for Azure Developer Productivity at Microsoft. He's passionate about helping people build innovative solutions with technology. His expertise spans Azure cloud services, developer tools, and modern software development practices. You can learn more about his career and background in the About section of his website.";
        }
        
        if (ContainsAny(messageLower, "contact", "reach", "connect"))
        {
            return "You can connect with David through multiple channels: LinkedIn (linkedin.com/in/dsanchezcr), Twitter (@dsanchezcr), GitHub (@dsanchezcr), and through the contact form on this website. He's also active on YouTube and other social platforms where he shares content about technology and development.";
        }
        
        return $"Thanks for your question about \"{message}\". I'm currently being enhanced with full NLWeb and Azure OpenAI capabilities to provide more intelligent responses about David's work and interests. For now, you can explore the blog, projects, and about sections to learn more about David's expertise in Azure, developer productivity, and technology.";
    }

    private static bool ContainsAny(string text, params string[] keywords)
    {
        return keywords.Any(keyword => text.Contains(keyword, StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<HttpResponseData> CreateSuccessResponseAsync<T>(HttpRequestData req, T data)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        await response.WriteStringAsync(JsonSerializer.Serialize(data, options));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { error = message }));
        return response;
    }
}