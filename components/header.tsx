"use client";

import { useEffect, useRef, useState } from "react";

export function Mark() {
  return <svg className="brand-mark" viewBox="0 0 166 166" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M80 14 L144 51 L144 121 L78 156 L22 122 L22 55"/><path d="M25 48 L67 21 L67 42 L38 60"/><path d="M22 55 L78 87 L22 122"/><path d="M78 87 L78 156"/><path d="M78 87 L144 121"/><path d="M80 14 L100 73 L144 51"/><path d="M78 87 L100 73 L92 96 L78 87"/></g></svg>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return <header className="site-header"><div className="container nav-inner"><a className="brand" href="#top" aria-label="Zentrix home" onClick={() => setOpen(false)}><Mark /><span>ZENTRIX</span></a><nav id="main-navigation" className={open ? "navigation open" : "navigation"} aria-label="Main navigation"><a href="#experiment" onClick={() => setOpen(false)}>Explore</a><a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a><a href="#about" onClick={() => setOpen(false)}>About</a><a className="nav-cta" href="#experiment" onClick={() => setOpen(false)}>Try the experiment <span aria-hidden="true">↗</span></a></nav><button ref={menuButton} className="menu-toggle" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}><span /><span /></button></div></header>;
}
