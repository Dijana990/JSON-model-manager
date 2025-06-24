# JSON model manager - Web App for Graphical Editing of IT System Models
Web application for uploading, visualizing, editing, and downloading JSON files that describe modeled IT systems. It allows users to intuitively manage devices, software, data, and network connections through a graphical interface, making complex JSON structures easy to understand and modify.

## 📋 Functional Specification
The application provides the following features:
- Upload JSON files describing modeled IT systems  
- Edit JSON files using an interactive graphical editor  
- Visualize modeled computers and connections, inspired by [REAGRAPH](https://reagraph.dev/)  
- Click on any computer node to open a sidebar editor for:
  - Renaming the computer
  - Editing its installed software and data (table view)
  - Changing its connected network
- Update the graphical view after making edits
- Save modified JSON files back to the server


## 🛠️ Technologies & Stack
- **React 19** – Core framework for building the user interface  
- **TypeScript** – Strongly-typed JavaScript for reliability and maintainability  
- **React DOM** – Enables rendering React components in the browser  
- **React Router DOM** – Client-side routing for seamless navigation  
- **Sass / SCSS** – Styles and preprocessing for a clean, maintainable design  
- **Axios** – HTTP client for data requests  
- **Three.js** – 3D rendering and interactive graphics  
- **Vanta.js** – Animated 3D backgrounds for a dynamic user experience  
- **Jest & Testing Library** – Unit and component testing for robust code  
- **web-vitals** – Monitoring and measuring app performance

## ⚡️ Getting Started
1. Clone the repository:
    ```bash
    git clone https://github.com/Dijana990/JSON-model-manager.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Run the app:
    ```bash
    npm start
    ```
4. Build for production:
    ```bash
    npm run build
    ```

## 👥 Contributing
Contributions, ideas, and feedback are very welcome! Feel free to open an issue or create a pull request.
