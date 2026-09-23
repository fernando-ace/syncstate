import { useGlobalState } from "./state";

function Counter() {
  const [count, setCount] = useGlobalState("count");

  return (
    <section className="counter" aria-labelledby="counter-heading">
      <div className="section-heading">
        <h2 id="counter-heading">Shared count</h2>
        <span>Synced through main</span>
      </div>
      <output data-testid="count" aria-live="polite">
        {count}
      </output>
      <div className="counter-actions">
        <button data-testid="decrement" onClick={() => setCount((value) => value - 1)}>
          Decrease
        </button>
        <button className="secondary" onClick={() => setCount(0)}>
          Reset
        </button>
        <button data-testid="increment" onClick={() => setCount((value) => value + 1)}>
          Increase
        </button>
      </div>
    </section>
  );
}

function SharedMessage() {
  const [message, setMessage] = useGlobalState("message");

  return (
    <label className="message-field">
      <span>Shared message</span>
      <input
        value={message}
        onChange={(event) => setMessage(event.currentTarget.value)}
        aria-describedby="message-help"
      />
      <small id="message-help">Type here and watch the other window update.</small>
    </label>
  );
}

export function App() {
  const windowName =
    new URLSearchParams(window.location.search).get("window") ?? "Renderer";

  return (
    <main>
      <header>
        <div className="mark" aria-hidden="true">S</div>
        <div>
          <p>SyncState</p>
          <h1>{windowName}</h1>
        </div>
        <div className="connection"><span />Connected</div>
      </header>
      <p className="intro">
        This renderer has no Node access. Every edit crosses the preload bridge and
        is committed by the main process.
      </p>
      <Counter />
      <SharedMessage />
      <footer>Keep both windows visible to verify two-way updates.</footer>
    </main>
  );
}
