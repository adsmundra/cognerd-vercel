# Project Overview

This project is a modern, monolithic SaaS starter kit built with Next.js 15 (using the App Router). It provides a foundation for building AI-powered applications with a rich feature set, including authentication, payments, and AI model integration.

## 🏗️ Architecture

The application follows a standard Next.js monolithic pattern, where the frontend and backend are co-located within the same project.

-   **`app/`**: The core directory for the Next.js App Router. It defines the entire routing structure of the application.
    -   `app/api/`: Contains all backend serverless functions.
-   **`components/`**: Holds all reusable React components.
    -   `components/ui/`: Contains the base component library (Shadcn/UI style).
    -   `components/providers.tsx`: Sets up global context (like React Query and Auth).
-   **`lib/`**: Contains the heart of the application's reusable business logic.
    -   `lib/auth.ts`: Configures authentication using `better-auth`.
    -   `lib/db.ts`: Manages database connections for PostgreSQL (Drizzle ORM) and MongoDB.
    -   `lib/ai-utils.ts`: Handles interactions with AI models.
-   **`prompts/`**: Contains managed, reusable prompts for AI models, allowing for version-controlled and structured AI instructions.
-   **`middleware.ts`**: Controls the application's security and routing, protecting routes and redirecting unauthenticated users.

## 🛠️ Tech Stack

-   **Framework**: Next.js 15, React 19
-   **UI**: Tailwind CSS 4, Radix UI, Shadcn/UI
-   **Database**: PostgreSQL (with Drizzle ORM) and MongoDB
-   **Authentication**: `better-auth`
-   **AI**: Vercel AI SDK (via OpenRouter for unified access to OpenAI, Anthropic, Google, Perplexity, etc.)
-   **Payments**: Stripe (managed via `autumn-js`)
-   **Data Fetching**: TanStack Query

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   pnpm
-   PostgreSQL database
-   MongoDB database

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up your environment variables by copying `.env.example` to `.env.local` and filling in the required values.
    ```bash
    cp .env.example .env.local
    ```

4.  Run database migrations:
    ```bash
    pnpm run db:push
    ```

5.  Start the development server:
    ```bash
    pnpm dev
    ```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Make your changes.
4.  Test thoroughly.
5.  Submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
