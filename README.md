# 🏀 Basketball File Uploader Component

An interactive, gamified drag-and-drop file upload component featuring realistic SVG net physics, arc trajectory calculation, rim rattle, and celebration confetti.

Available for **Vanilla JavaScript**, **Web Components**, and **React / Next.js**.

---

## 🌟 Quick Start

### 1. Plain HTML / Vanilla JS (Zero Dependencies)

Include the script in your page and mount it anywhere:

```html
<!-- Container -->
<div id="uploader"></div>

<!-- Component Script -->
<script src="path/to/BasketballUpload.js"></script>
<script>
  const uploader = new BasketballUpload('#uploader', {
    title: 'Drop your file anywhere',
    onFile: (file) => {
      console.log('File ready for upload:', file.name);
      // Send file to your backend API via fetch or FormData
    }
  });
</script>
```

---

### 2. Native Web Component (`<basketball-upload>`)

Use it as a custom HTML tag without writing any JavaScript setup:

```html
<script src="path/to/BasketballUpload.js"></script>

<basketball-upload
  title="Drop your files here"
  button-text="Choose File"
  success-text="Three Pointer!"
></basketball-upload>

<script>
  document.querySelector('basketball-upload').addEventListener('file-upload', (e) => {
    console.log('Uploaded file:', e.detail.file);
  });
</script>
```

---

### 3. React / Next.js

Import and use the component in your React application:

```jsx
import BasketballUpload from './BasketballUpload';

export default function App() {
  const handleUpload = (file) => {
    console.log('Received file:', file);
    // e.g., upload to S3, Supabase, or API route
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
      <BasketballUpload
        title="Drop your resume"
        subtitle="Drag across screen to view shot trajectory"
        buttonText="Select File"
        onUpload={handleUpload}
      />
    </main>
  );
}
```

---

## ⚙️ Configuration & Options

### Vanilla JS Options (`new BasketballUpload(target, options)`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onFile` | `Function` | `null` | Callback `(file: File) => void` triggered when ball scores |
| `title` | `String` | `'Drop your file anywhere'` | Title displayed below the hoop |
| `subtitle` | `String` | `'Drag across screen...'` | Helper subtext |
| `buttonText` | `String` | `'Browse File'` | Label for the file picker button |
| `successText` | `String` | `'Swish! Slam Dunk'` | Text displayed in badge on score |
| `allowGlobalDrop`| `Boolean` | `true` | If true, dragging a file anywhere triggers trajectory |
| `enableConfetti` | `Boolean` | `true` | Celebratory confetti canvas animation |

### React Props (`<BasketballUpload {...props} />`)

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onUpload` | `(file: File) => void` | `undefined` | Callback fired when file is dropped/selected |
| `title` | `string` | `'Drop your file anywhere'` | Main card title |
| `subtitle` | `string` | `'Drag across screen...'` | Subtitle description |
| `buttonText` | `string` | `'Browse File'` | Button text |
| `successText` | `string` | `'Swish! Slam Dunk'` | Toast pill message on score |
| `allowGlobalDrop` | `boolean` | `true` | Enable whole-window dropzone |
| `enableConfetti` | `boolean` | `true` | Enable canvas celebration |
| `className` | `string` | `''` | Custom CSS class names |

---

## 🚀 How to Share / Publish for Others

### Option A: Publish as an npm Package
1. Run `npm init -y` in the root.
2. In `package.json`, set:
   ```json
   {
     "name": "basketball-file-upload",
     "version": "1.0.0",
     "main": "src/BasketballUpload.js",
     "module": "src/BasketballUpload.js"
   }
   ```
3. Run `npm publish`.
4. Anyone can install with:
   ```bash
   npm install basketball-file-upload
   ```

### Option B: Free CDN via GitHub Releases (unpkg / jsDelivr)
Once pushed to GitHub, users can load it directly via:
```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/basketball-file-upload@main/src/BasketballUpload.js"></script>
```

### Option C: Share on 21st.dev / Uiverse / Twitter / LinkedIn
Because this is a gamified component, posting a 5-second screen recording with a link to a GitHub repository is one of the highest-converting portfolio pieces for frontend engineering roles.

