import type { JSX } from 'solid-js';
import './NavBar.css';

interface NavBarProps {
  children: JSX.Element;
}

export function NavBar(props: NavBarProps) {
  return <nav class="nav-bar">{props.children}</nav>;
}

interface NavButtonProps {
  label: string;
  class?: string;
  onClick: () => void;
  children: JSX.Element;
}

export function NavButton(props: NavButtonProps) {
  return (
    <button
      type="button"
      class={`nav-button ${props.class ?? ''}`}
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
