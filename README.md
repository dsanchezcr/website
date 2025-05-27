# David's Personal Website

This repository contains the source code for my personal website and blog, [dsanchezcr.com](https://dsanchezcr.com). The site is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

[![Build and Deploy Website](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml)
[![Build and Deploy Azure Function](https://github.com/dsanchezcr/website/actions/workflows/api.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/api.yml)
[![CodeQL](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml)

## ✨ About This Repository

This website serves as a platform to share my thoughts on technology, software development, and other interests through blog posts. It also includes information about my projects and professional background.

## 🚀 Tech Stack

*   **[Docusaurus v3](https://docusaurus.io/)**: Main framework for building the static site.
*   **[React](https://reactjs.org/)**: JavaScript library for building user interfaces.
*   **[Markdown (MDX)](https://mdxjs.com/)**: For writing content (blog posts, pages).
*   **Internationalization (i18n)**: Content is available in English, Spanish, and Portuguese.
*   **Azure Static Web Apps**: For hosting and deployment.
*   **Azure Functions**: For backend API functionality (e.g., contact form).

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/dsanchezcr/website.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd website
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```

### Running Locally

To start the development server and view the website locally:

```sh
npm start
```

This command will open a new browser window with the local version of the site, typically at `http://localhost:3000`. The site will automatically reload if you make changes to the source files.

## 🛠️ Building the Site

To generate a static build of the website for production:

```sh
npm run build
```

The build artifacts will be stored in the `build/` directory.

## 🌍 Internationalization (i18n)

This website supports multiple languages:
*   English (default)
*   Spanish (`es`)
*   Portuguese (`pt`)

Content for different languages is managed using Docusaurus's i18n features. Translated files are located in the `i18n/` directory.

## ☁️ Deployment

The website is automatically built and deployed to [Azure Static Web Apps](https://azure.microsoft.com/services/app-service/static/) via GitHub Actions. The workflows are defined in the `.github/workflows/` directory:
*   `azure-static-web-app.yml`: Builds and deploys the Docusaurus website.
*   `api.yml`: Builds and deploys the Azure Function API.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/dsanchezcr/website/issues).

## 📝 License

This project is private and the code is proprietary. However, the blog content, unless otherwise stated, is open for sharing and referencing with appropriate attribution.

---

Thank you for visiting my repository!