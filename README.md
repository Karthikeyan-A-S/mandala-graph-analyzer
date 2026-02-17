# 🕸️ Mandala Graph Analyzer

**Mandala Graph Analyzer** is a React-based interactive tool for generating artistic Mandalas and analyzing their topological network structure. This application bridges the gap between digital art and graph theory, allowing users to visualize the connectivity and centrality metrics of mandala patterns in real-time.

**🚀 Live Demo:** [https://karthikeyan-a-s.github.io/mandala-graph-analyzer/](https://karthikeyan-a-s.github.io/mandala-graph-analyzer/)

---

## ✨ Key Features

### 🎨 Visual Construction (Canvas)
* **Library & Custom Uploads:** Choose from a built-in library of primitive shapes or upload your own images/icons to create unique patterns.
* **Parametric Editing:** Precise control over every aspect of the mandala:
    * **Grid Order:** Adjust the number of radial spokes (symmetry).
    * **Motif Properties:** Fine-tune Radius, Angle, Rotation, Scale, and Count (Multiplicity) for each layer.
    * **Styling:** Apply color tinting, inversion, and flipping to motifs.
* **Center Element Mode:** A special toggle to designate a motif as the singular "Seed" or Center node (Node 0), ensuring correct topological structure.

### 🕸️ Graph & Network Analysis
* **Dual View Modes:**
    * **Image View:** High-resolution rendering of the artistic mandala.
    * **Graph View:** A topological representation where motifs become nodes and spatial relationships become edges.
    * **Overlay Mode:** Superimpose the graph onto the image with independent **Image** and **Graph Opacity** sliders to validate alignment.
* **Topology Controls:**
    * **Radial Edges:** Toggle connections between layers (Inner Ring ↔ Outer Ring).
    * **Ring Edges:** Toggle connections between neighbors in the same ring.
* **Centrality Heatmaps:** Visualize network metrics directly on the graph nodes:
    * **Degree Centrality:** Number of direct connections.
    * **Closeness Centrality:** Average distance to all other nodes.
    * **Betweenness Centrality:** How often a node acts as a bridge along the shortest path between two other nodes.
    * **Eigenvector Centrality:** Influence of a node in the network.

### 💾 Data I/O & Export
* **Project Saving:** Save and Load the entire workspace state as a `mandala.json` file.
* **Connectivity Export:** Download a structured Adjacency List (`mandala_connectivity.json`) optimized for research in **MATLAB** or **Python** (NetworkX).
* **Image Export:** Download High-DPI **PNG** images and Vector **SVG** graphs.
* **Analysis Table:** View and export a CSV table of all calculated centrality metrics.

---

## 🛠️ Installation & Local Development

This project is built with **React** and **Vite**.

### Prerequisites
* Node.js (v14 or higher)
* npm (v6 or higher)

### Steps
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/karthikeyan-a-s/mandala-graph-analyzer.git](https://github.com/karthikeyan-a-s/mandala-graph-analyzer.git)
    cd mandala-graph-analyzer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open your browser to `http://localhost:5173/` (or the port shown in your terminal).

---

## 🚀 Deployment (GitHub Pages)

This app is configured for **GitHub Pages**.

1.  **Configure Base Path:**
    Open `vite.config.js` and ensure the `base` property matches your repository name to prevent 404 errors on image loading:
    ```javascript
    export default defineConfig({
      plugins: [react()],
      base: '/mandala-graph-analyzer/', // CRITICAL: Must match repo name
    })
    ```

2.  **Deploy:**
    Run the deployment script (builds and pushes to `gh-pages` branch):
    ```bash
    npm run deploy
    ```

---

## 📊 Data Formats

### Connectivity JSON (Adjacency List)
The `mandala_connectivity.json` export uses a simplified format tailored for graph research.

**Logic:**
* **Nodes:** 0-indexed. Node `0` (`center-node`) is always the merged center.
* **Layers:** Motifs with the same radius are grouped into a single layer.
* **Radial Edges:** Connect a node in Layer `N` to a node in Layer `N-1`. They do *not* connect siblings in the same layer.

**Example Structure:**

```json
{
  "description": "Adjacency List (Center Merged, Layer-Grouped)",
  "topology_settings": {
    "radial": true,
    "ring": true
  },
  "node_count": 25,
  "edges": [
    [1, 0],
    [2, 0],
    [2, 1]
  ]
}
```

---

## 🧩 Usage Tips

### Creating a Center Node
1. Add a motif to be the center.
2. In the **Edit** panel, check the **"Set as Center Element"** box.
3. This automatically locks the count to **1** and places it at coordinates `(0,0)`.  
   All immediate neighbors will connect to this single node.

### Validating Topology
1. Switch to **Overlay** mode.
2. Use the **Graph Topology** checkboxes to enable/disable **Radial** or **Ring** connections.
3. Adjust the **Graph Opacity** and **Image Opacity** sliders to visually confirm that the mathematical nodes align perfectly with your visual shapes.

### Exporting for MATLAB
1. Click the **⬇ Connectivity** button in the **Data I/O** panel.
2. Use the generated JSON file to import `edges` and `node_count` into your MATLAB graph object.

---

## 📝 License

This project is open-source. Feel free to fork and modify!
