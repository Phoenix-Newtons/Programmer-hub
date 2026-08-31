/**
 * Brand marks are no longer shipped with lucide-react v1, so these three live here.
 * They accept the same props as lucide icons (className, size, strokeWidth…).
 */
function Svg({ size = 24, children, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Github({ size = 24, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M12 .5C5.73.5.9 5.34.9 11.62c0 4.9 3.18 9.05 7.58 10.52.56.1.76-.24.76-.53l-.01-1.86c-3.08.67-3.73-1.48-3.73-1.48-.5-1.28-1.23-1.62-1.23-1.62-1-.69.08-.67.08-.67 1.11.08 1.69 1.14 1.69 1.14.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.7-1.48-2.44-.28-5.01-1.22-5.01-5.44 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.92 0 0 .92-.3 3.02 1.12a10.5 10.5 0 0 1 5.5 0c2.1-1.42 3.02-1.12 3.02-1.12.6 1.52.22 2.64.11 2.92.7.77 1.13 1.75 1.13 2.95 0 4.23-2.58 5.16-5.03 5.43.39.34.74 1 .74 2.02l-.01 2.99c0 .29.2.64.77.53a11.03 11.03 0 0 0 7.58-10.52C23.1 5.34 18.27.5 12 .5Z" />
    </Svg>
  );
}

export function Linkedin({ size = 24, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </Svg>
  );
}

export function X({ size = 24, ...props }) {
  return (
    <Svg size={size} {...props}>
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.24 2.25h6.83l4.72 6.24 5.45-6.24Zm-1.16 17.52h1.83L7.08 4.13H5.11l11.97 15.64Z" />
    </Svg>
  );
}

export default { Github, Linkedin, X };
