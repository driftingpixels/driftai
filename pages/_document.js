import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html>
            <Head />
            <body>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              (function() {
                try {
                  var localValue = localStorage.getItem('selectedTheme');
                  var theme = localValue || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
                    }}
                />
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
