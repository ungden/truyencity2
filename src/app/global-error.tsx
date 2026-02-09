"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#fafafa',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: '#e5e5e5', marginBottom: '1rem' }}>
              500
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#171717' }}>
              Da xay ra loi
            </h1>
            <p style={{ color: '#737373', marginBottom: '2rem' }}>
              Co loi nghiem trong xay ra. Vui long thu tai lai trang.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#171717',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Thu lai
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
