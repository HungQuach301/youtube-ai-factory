export const metadata = { title: "Factory Browser QA Fixture · YouTube AI Factory" };

export default function FactoryBrowserQaFixturePage() {
  return <main style={{ minHeight: "100vh", background: "#07110e", padding: 18 }}>
    <iframe title="Factory Browser QA qualification fixture" src="/api/factory/sequential-production/factory-browser-qa?view=fixture" style={{ display: "block", width: "100%", minHeight: "1500px", border: 0, background: "#07110e" }} />
  </main>;
}
