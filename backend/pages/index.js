export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Streetwear Fullstack App</h1>
      <p>
        UI routes are served at <code>/</code>, <code>/products</code>,{" "}
        <code>/cart</code>, <code>/checkout</code>, <code>/login</code>,{" "}
        <code>/profile</code>.
      </p>
      <p>
        REST API is available under <code>/api/*</code>. For integration
        details, see <code>README.md</code>.
      </p>
    </main>
  );
}
