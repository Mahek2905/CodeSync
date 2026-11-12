
export default function CodePreview() {
  return (
    <pre className="code-preview">
      <span>
        <i>1</i>{' '}
        <b className="code-purple">import</b>{' '}
        {`{ `}
        <b className="code-cyan">useMemo</b>
        {` } `}
        <b className="code-purple">from</b>{' '}
        <em>'react'</em>
      </span>

      <span>
        <i>2</i>{' '}
        <b className="code-purple">import</b>{' '}
        {`{ `}
        <b className="code-cyan">Activity</b>
        {` } `}
        <b className="code-purple">from</b>{' '}
        <em>'lucide-react'</em>
      </span>

      <span><i>3</i></span>

      <span>
        <i>4</i>{' '}
        <b className="code-purple">const</b> stations = [
        <em>'Odyssey'</em>, <em>'Calypso'</em>]
      </span>

      <span><i>5</i></span>

      <span>
        <i>6</i>{' '}
        <b className="code-purple">export function</b>{' '}
        <b className="code-cyan">CommandCenter</b>() {'{'}
      </span>

      <span>
        <i>7</i>{' '}
        <b className="code-purple">const</b> [active, setActive] = useState(
      </span>

      <span>
        <i>8</i> stations[<b className="code-amber">0</b>]
      </span>

      <span><i>9</i> )</span>
      <span><i>10</i></span>

      <span>
        <i>11</i>{' '}
        <b className="code-purple">return</b> (
      </span>

      <span>
        <i>12</i>{'    <'}
        <b className="code-cyan">section</b>
        {' className="command-center">'}
      </span>

      <span>
        <i>13</i>{'      <'}
        <b className="code-cyan">header</b>
        {'>'}
      </span>

      <span>
        <i>14</i>{'        <'}
        <b className="code-cyan">h1</b>
        {'>Telemetry / '}
        {`{active}`}
        {' </'}
        <b className="code-cyan">h1</b>
        {'>'}
      </span>

      <span>
        <i>15</i>{'      </'}
        <b className="code-cyan">header</b>
        {'>'}
      </span>
    </pre>
  )
}
