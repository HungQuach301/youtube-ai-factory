import { GoldenMasterPlayer } from "../golden-master-player";

export const metadata = { title: "Browser QA Qualification Fixture · YouTube AI Factory" };

export default function BrowserQaFixturePage() {
  return <main style={{ minHeight: "100vh", background: "#07110e", color: "#e8f4ef", padding: "clamp(18px,4vw,54px)" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 22 }}>
      <header>
        <p style={{ color: "#78c8a5", fontSize: 11, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" }}>Browser Assurance Gate V1</p>
        <h1 style={{ margin: "8px 0", font: "600 clamp(32px,5vw,58px)/1.02 Georgia,serif", letterSpacing: "-.04em" }}>QA the rendered experience, not the source code.</h1>
        <p style={{ maxWidth: 800, color: "#a9bdb5", lineHeight: 1.6 }}>This controlled fixture verifies real browser playback, controls, focus, reflow and visible-state evidence. It is qualification evidence for the QA mechanism only and can never become production or release evidence.</p>
      </header>
      <section style={{ padding: 20, border: "1px solid #315247", borderRadius: 18, background: "#0d1915" }}>
        <GoldenMasterPlayer src="/qa/browser-assurance-fixture.webm" state="QUALIFICATION_FIXTURE" expectedDuration={6.008} expectedHash="120f895977d2c50214f4bc4f9c2676d81c483f3be1d0e6b137adc8e198c5d55a" probe={{ width: 1920, height: 1080, durationSeconds: 6.008, averageFrameRate: 30, audioSampleRate: 48000, audioChannels: 1 }} mode="QUALIFICATION_FIXTURE" />
      </section>
    </div>
  </main>;
}
