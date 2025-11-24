# StoryForge

**The Professional Story Management Platform**

StoryForge is a comprehensive web application designed for writers, content creators, and storytellers who need powerful tools to manage, edit, and analyze their written works. Built with modern web technologies, StoryForge provides an intuitive interface for writing, organizing, and tracking your stories with advanced features like keyword highlighting, content analytics, and seamless GitHub integration.

[**View Live Demo**](https://storyforge.app) | [Documentation](#) | [Report Issue](https://github.com/berningb/storyforge/issues)

---

## Overview

StoryForge combines the power of a rich text editor with intelligent content management features. Whether you're writing fanfiction, novels, blog posts, or any other form of written content, StoryForge provides the tools you need to create, organize, and refine your work.

### Key Features

- **Advanced Rich Text Editor**: Professional-grade editor with WYSIWYG, Markdown, and HTML modes
- **Intelligent Keyword Highlighting**: Visual keyword tracking with customizable color coding and statistics
- **Content Analytics**: Real-time word counts, character statistics, and keyword density analysis
- **GitHub Integration**: Seamlessly save and manage your stories directly in GitHub repositories
- **Story Management Dashboard**: Organize and analyze your stories with character and location tracking
- **Secure Authentication**: Enterprise-grade security with GitHub OAuth integration
- **Real-time Collaboration**: Fetch latest versions and manage conflicts with built-in version control

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- GitHub account (for authentication and repository access)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/berningb/storyforge.git
   cd storyforge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see [Configuration](#configuration) below)

4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable GitHub Authentication:
   - Navigate to **Authentication > Sign-in method**
   - Enable the **GitHub** provider
   - Create a GitHub OAuth App at [GitHub Developer Settings](https://github.com/settings/developers)
   - Set Authorization callback URL to: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`
   - Copy the Client ID and Client Secret to Firebase Console
   - Add your domain to authorized domains if needed

3. Get your Firebase configuration:
   - Go to **Project Settings > General**
   - Scroll to **Your apps** section
   - Copy the Firebase configuration values

4. Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

---

## Development

### Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Deployment

StoryForge is optimized for deployment on Firebase Hosting, but can be deployed to any static hosting service.

### Firebase Hosting Deployment

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase Hosting (if not already configured):
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `dist`
   - Configure as single-page app: **Yes**
   - Set up automatic builds: **No**

4. Deploy:
   ```bash
   npm run deploy
   ```

---

## Technology Stack

StoryForge is built with modern, industry-standard technologies:

- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Authentication and hosting
- **GitHub API** - Repository management and version control
- **@react-quill/lib** - Custom rich text editor component

---

## Project Structure

```
storyforge/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/         # React context providers
│   ├── lib/             # Utility libraries and API clients
│   ├── pages/           # Application pages/routes
│   └── main.jsx         # Application entry point
├── public/               # Static assets
└── dist/                 # Production build output
```

---

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest features.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support, feature requests, or bug reports, please open an issue on [GitHub](https://github.com/berningb/storyforge/issues).

---

**Built with ❤️ by the StoryForge team**
