import { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b border-gray-100 px-6 py-4 ${className}`} {...props} />;
}

export function CardBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-4 ${className}`} {...props} />;
}
