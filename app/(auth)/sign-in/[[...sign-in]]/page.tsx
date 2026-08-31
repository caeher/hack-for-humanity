import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'warm-shadow border border-border bg-card',
          },
        }}
      />
    </div>
  )
}
