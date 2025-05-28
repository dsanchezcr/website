#!/usr/bin/env python3
"""
Minimal NLWeb backend API for David Sanchez's website.
This provides a simple REST endpoint that will be enhanced with full NLWeb functionality.
"""

import json
import asyncio
from aiohttp import web, web_request
from aiohttp.web_response import Response
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleNLWebAPI:
    def __init__(self):
        self.app = web.Application()
        self.setup_routes()
        self.setup_cors()
        
    def setup_routes(self):
        """Set up API routes"""
        self.app.router.add_post('/api/chat', self.handle_chat)
        self.app.router.add_get('/api/health', self.health_check)
        self.app.router.add_options('/api/chat', self.handle_preflight)
        
    def setup_cors(self):
        """Set up CORS middleware"""
        async def cors_middleware(request, handler):
            if request.method == 'OPTIONS':
                response = web.Response()
            else:
                response = await handler(request)
            
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            return response
            
        self.app.middlewares.append(cors_middleware)
    
    async def handle_preflight(self, request):
        """Handle CORS preflight requests"""
        return web.Response()
    
    async def health_check(self, request):
        """Health check endpoint"""
        return web.json_response({'status': 'healthy', 'service': 'nlweb-api'})
    
    async def handle_chat(self, request):
        """Handle chat requests"""
        try:
            data = await request.json()
            user_message = data.get('message', '')
            
            if not user_message.strip():
                return web.json_response(
                    {'error': 'Message cannot be empty'}, 
                    status=400
                )
            
            # Simulate processing delay
            await asyncio.sleep(1)
            
            # Generate a contextual response based on the message
            response_text = self.generate_response(user_message)
            
            return web.json_response({
                'response': response_text,
                'timestamp': '2025-01-10T12:00:00Z',
                'status': 'success'
            })
            
        except json.JSONDecodeError:
            return web.json_response(
                {'error': 'Invalid JSON in request body'}, 
                status=400
            )
        except Exception as e:
            logger.error(f"Error processing chat request: {e}")
            return web.json_response(
                {'error': 'Internal server error'}, 
                status=500
            )
    
    def generate_response(self, message):
        """Generate a contextual response. This will be replaced with Azure OpenAI integration."""
        message_lower = message.lower()
        
        # Simple keyword-based responses for demonstration
        if any(word in message_lower for word in ['azure', 'cloud', 'microsoft']):
            return """David has extensive experience with Azure and Microsoft technologies. He works as a Global Black Belt for Azure Developer Productivity at Microsoft. You can find many of his blog posts about Azure Cosmos DB, Azure OpenAI, Azure Cognitive Search, and other Azure services on his blog. He's particularly passionate about helping developers be more productive with Azure tools and services."""
        
        elif any(word in message_lower for word in ['blog', 'posts', 'articles', 'writing']):
            return """David loves writing and sharing about technology. His blog covers topics like Azure services, developer productivity, cloud development environments, and modern software development practices. Some of his popular posts include topics on Azure Cosmos DB with Azure OpenAI, GitHub Codespaces vs Microsoft DevBox, and various Azure integrations. You can explore all his posts in the blog section."""
        
        elif any(word in message_lower for word in ['projects', 'github', 'open source']):
            return """All of David's projects are open source and available on GitHub. He's contributed to various projects related to Azure, developer tools, and web technologies. You can check out his projects section to see his latest work, including this website itself which is built with Docusaurus and deployed on Azure Static Web Apps."""
        
        elif any(word in message_lower for word in ['speaking', 'presentations', 'talks', 'sessions']):
            return """David is an active speaker in the tech community. You can find his speaking sessions and presentations on Sessionize. He often talks about Azure services, developer productivity, cloud development, and modern software development practices. His sessions cover both technical deep-dives and practical guidance for developers."""
        
        elif any(word in message_lower for word in ['about', 'career', 'background', 'experience']):
            return """David Sanchez is a Global Black Belt for Azure Developer Productivity at Microsoft. He's passionate about helping people build innovative solutions with technology. His expertise spans Azure cloud services, developer tools, and modern software development practices. You can learn more about his career and background in the About section of his website."""
        
        elif any(word in message_lower for word in ['contact', 'reach', 'connect']):
            return """You can connect with David through multiple channels: LinkedIn (linkedin.com/in/dsanchezcr), Twitter (@dsanchezcr), GitHub (@dsanchezcr), and through the contact form on this website. He's also active on YouTube and other social platforms where he shares content about technology and development."""
        
        else:
            return f"""Thanks for your question about "{message}". I'm currently being enhanced with full NLWeb and Azure OpenAI capabilities to provide more intelligent responses about David's work and interests. For now, you can explore the blog, projects, and about sections to learn more about David's expertise in Azure, developer productivity, and technology."""

async def create_app():
    """Create and configure the web application"""
    api = SimpleNLWebAPI()
    return api.app

async def main():
    """Main entry point"""
    app = await create_app()
    
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 8080))
    
    # Start the server
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    
    logger.info(f"NLWeb API server started on port {port}")
    logger.info(f"Health check: http://localhost:{port}/api/health")
    logger.info(f"Chat endpoint: http://localhost:{port}/api/chat")
    
    # Keep the server running
    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
    finally:
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())