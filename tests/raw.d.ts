// Vite's `?raw` suffix imports a file's text; lets tests read index.html.
declare module '*?raw' {
  const content: string;
  export default content;
}
