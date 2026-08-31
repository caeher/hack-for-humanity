import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <SignUp
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
