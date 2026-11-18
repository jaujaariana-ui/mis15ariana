"use client";

import React from 'react';

interface EventSlugLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function EventSlugLink({ href, children, className }: EventSlugLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
