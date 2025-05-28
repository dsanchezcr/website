# NLWeb Integration

This directory contains the integration of [Microsoft's NLWeb](https://github.com/microsoft/NLWeb) natural language web interface toolkit into David Sanchez's personal website.

## Overview

NLWeb enables websites to provide conversational interfaces to their content. This integration adds a chat component to the website that allows visitors to ask questions about David's work, blog posts, projects, and expertise in natural language.

## Architecture

### Frontend (React Component)
- **Location**: `src/components/NLWebChat/`
- **Framework**: React (Docusaurus component)
- **Features**:
  - Modern chat interface with message bubbles
  - Support for light/dark themes
  - Responsive design
  - Real-time typing indicators
  - Fallback responses when backend is unavailable

### Backend API
- **File**: `nlweb-api.py`
- **Framework**: aiohttp (Python async web framework)
- **Features**:
  - RESTful API for chat requests
  - CORS support for cross-origin requests
  - Health check endpoint
  - Contextual responses based on message content
  - Ready for Azure OpenAI integration

## Setup Instructions

### Development Setup

1. **Install Backend Dependencies**
   ```bash
   pip install -r requirements-api.txt
   ```

2. **Start the NLWeb API Server**
   ```bash
   python nlweb-api.py
   ```
   The API will run on `http://localhost:8080`

3. **Start Docusaurus Development Server**
   ```bash
   npm start
   ```
   The website will run on `http://localhost:3000`

4. **Test the Integration**
   - Visit the homepage
   - Scroll down to the chat component
   - Try asking questions about David's work

### Production Deployment

The NLWeb API can be deployed to various platforms:

#### Azure Functions (Recommended)
- Deploy `nlweb-api.py` as an Azure Function
- Set environment variables for Azure OpenAI
- Update the frontend API URL configuration

#### Azure App Service
- Create an Azure App Service for Python
- Deploy the API code
- Configure environment variables

#### Azure Container Instances
- Create a Docker container with the API
- Deploy to Azure Container Instances
- Configure networking and environment variables

## Configuration

### Environment Variables
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI service endpoint
- `AZURE_OPENAI_API_KEY`: API key for Azure OpenAI
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Name of your deployed model
- `PORT`: Port for the API server (default: 8080)

### Frontend Configuration
The React component automatically detects the environment:
- **Development**: Calls `http://localhost:8080/api/chat`
- **Production**: Calls `/api/chat` (assumes API is on same domain)

## Features

### Current Capabilities
- ✅ Modern chat interface integrated into Docusaurus
- ✅ Theme-aware styling (light/dark mode support)
- ✅ Responsive design for all devices
- ✅ Contextual responses based on keywords
- ✅ Error handling and fallback responses
- ✅ CORS-enabled API for cross-origin requests

### Planned Enhancements
- [ ] Full Azure OpenAI integration
- [ ] Vector database for content search
- [ ] Blog post and project content indexing
- [ ] Session memory for conversations
- [ ] Multi-language support (EN/ES/PT)
- [ ] Advanced NLWeb features (MCP protocol support)

## API Endpoints

### POST /api/chat
Send a chat message and receive a response.

**Request:**
```json
{
  "message": "What does David work on at Microsoft?"
}
```

**Response:**
```json
{
  "response": "David Sanchez is a Global Black Belt for Azure Developer Productivity at Microsoft...",
  "timestamp": "2025-01-10T12:00:00Z",
  "status": "success"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "nlweb-api"
}
```

## Customization

### Styling
The chat component uses CSS modules (`styles.module.css`) and follows Docusaurus theming conventions. To customize:

1. Modify `src/components/NLWebChat/styles.module.css`
2. Update CSS variables to match your brand colors
3. Ensure both light and dark theme support

### Responses
To customize the AI responses:

1. Edit the `generate_response()` method in `nlweb-api.py`
2. Add more keywords and response patterns
3. Integrate with Azure OpenAI for dynamic responses

### Integration Location
The chat component is currently integrated into the homepage (`src/pages/index.js`). To move it:

1. Import the component in your desired page
2. Add `<NLWebChat />` where you want it to appear
3. Ensure the styling works in the new context

## Troubleshooting

### Component Not Appearing
- Check console for JavaScript errors
- Verify the component import path
- Ensure CSS modules are loading correctly

### API Connection Issues
- Verify the backend API is running
- Check CORS configuration
- Confirm the API URL is correct for your environment

### Styling Issues
- Check CSS variable definitions in `custom.css`
- Verify theme switching works correctly
- Test responsive design on different screen sizes

## Contributing

To contribute to the NLWeb integration:

1. Follow the setup instructions above
2. Make your changes to the component or API
3. Test thoroughly in both light and dark themes
4. Ensure responsive design works on all devices
5. Submit a pull request with clear description

## Resources

- [NLWeb GitHub Repository](https://github.com/microsoft/NLWeb)
- [Azure OpenAI Documentation](https://docs.microsoft.com/azure/ai-services/openai/)
- [Docusaurus Documentation](https://docusaurus.io/)
- [aiohttp Documentation](https://docs.aiohttp.org/)