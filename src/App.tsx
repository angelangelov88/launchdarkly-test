import { useState, useEffect } from 'react'
import { fetchAuthSession, fetchUserAttributes, signIn } from 'aws-amplify/auth'
import { useFlags, withLDProvider } from 'launchdarkly-react-client-sdk'
import Observability from '@launchdarkly/observability'
import SessionReplay from '@launchdarkly/session-replay'
import { LsDocumentViewer } from 'legalesign-document-viewer-react'

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null)
  const { test } = useFlags();

  const makeSecurity = async () => {
    const session = await fetchAuthSession()
    if (session.tokens) {
      setToken(session.tokens.accessToken.toString())
    }
  }

  const byPass = async () => {
    try {
      // Using localhost user - only for development and preview NEVER add these ENV vars to PROD
    
        // await localStorage.clear();
        await signIn({
          username: import.meta.env.VITE_local_user,
          password: import.meta.env.VITE_local_password,
        });

        await setIsAuthenticated(true);

        const uInfo: any = await fetchUserAttributes();
        setUser(uInfo?.email);

        return true;
      
    } catch (e) {
      console.log(`Set up user information`, e);

      return false;
    }
  };

  useEffect(() => {
    async function checkUser() {
      let uInfo = null;
      try {
        uInfo = await fetchUserAttributes();
      } catch {
        uInfo = null;
      }

      if (uInfo) {
        if (user !== uInfo?.email) {
          localStorage.clear();
          setUser(uInfo.email || '');
        }
        setIsAuthenticated(true);
        setUser(uInfo.email || '');
      } else {
        console.log(`Bypassing for development`);
        await byPass();
        await makeSecurity();
      }
    }
    checkUser();
  }, []);

  const handleUpdate = (event: any) => {
    console.log('Document updated:', event.detail)
  }

  const handleValidate = (event: any) => {
    console.log('Template validation changed:', event.detail.valid)
  }

  if (!token) {
    return <div>Loading token...</div>
  }

  return isAuthenticated && test ? (
    <div style={{ padding: 0, margin: 0, height: '100vh' }}>
      <LsDocumentViewer
        templateid="dHBsMGUwZjYxOWQtMTI0Ny0xMWYxLTgwNzYtMDY5NzZlZmU0MzIx"
        token={token}
        endpoint="https://k2howlr3ynfy3lbx7oxz4qyrlq.appsync-api.eu-west-2.amazonaws.com/graphql"
        mode="compose"
        recipients={JSON.stringify([
          {"email": "euan.rob@smashcorp.com", "firstName": "Juan", "lastName": "First", "signerIndex": 1, "roleType": "APPROVER"},
          {"email": "euan.rob@smashcorp.com", "firstName": "Bob", "lastName": "Second", "signerIndex": 2}
        ])}
        filtertoolbox="signature|initials|date|signing date"
        onUpdate={handleUpdate}
        onValidate={handleValidate}
      >
        <style>{`
          .ls-top-button {
            all: unset;
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            align-items: center;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.125rem 0.5rem;
            color: var(--gray-90);
            cursor: pointer;
          }
          .ls-top-button:hover {
            color: var(--gray-100);
            background: var(--gray-10);
          }
        `}</style>
        <button slot="left-button" className="ls-top-button">Exit</button>
        <button slot="right-button" className="ls-top-button">Send</button>
      </LsDocumentViewer>
    </div>
  ) : !test ? 'not new header' : 'notauthenticated'
}

export default withLDProvider({
  clientSideID: import.meta.env.VITE_LD_CLIENT_SIDE_ID,
  options: {
    bootstrap: 'localStorage',
    plugins: [
      new Observability({
        networkRecording: {
          enabled: true,
          recordHeadersAndBody: true
        }
      }),
      new SessionReplay({
        privacySetting: 'strict'
      })
    ]
  },
  context: {
    kind: 'user',
    key: 'user-' + Date.now(),
    email: 'user@example.com'
  }
})(App)
