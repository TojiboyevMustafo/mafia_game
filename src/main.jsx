import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { missingKeys } from './firebase';
import './index.css';

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return <Notice title="Xatolik yuz berdi" text={String(this.state.err.message || this.state.err)} />;
    return this.props.children;
  }
}

const Notice = ({ title, text, list }) => (
  <div style={{ minHeight: '100dvh', padding: 24, color: '#f1f5f9', background: '#0a0a14' }}>
    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fb7185' }}>{title}</h1>
    <p style={{ marginTop: 12, color: '#cbd5e1' }}>{text}</p>
    {list && <ul style={{ marginTop: 12, fontFamily: 'monospace', color: '#fcd34d' }}>{list.map((k) => <li key={k}>• {k}</li>)}</ul>}
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  missingKeys.length
    ? <Notice title="Firebase kalitlari topilmadi" text="Vercel → Settings → Environment Variables ga quyidagilarni qo'shing va Redeploy qiling:" list={missingKeys} />
    : <Boundary><App /></Boundary>
);
