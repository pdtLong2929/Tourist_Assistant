import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Read the header that NGINX injected after verifying the JWT with the login service
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    // This technically shouldn't happen because NGINX drops unauthenticated requests,
    // but it's good practice to double-check in case someone bypassed NGINX directly.
    return NextResponse.json(
      { message: 'Unauthorized: Missing User ID from API Gateway' },
      { status: 401 }
    );
  }

  // Return protected data!
  return NextResponse.json({
    message: 'Success! You have accessed a protected backend route.',
    data: {
      userId: userId,
      secret: 'This data is only visible to users because NGINX verified their JWT beforehand.',
      timestamp: new Date().toISOString(),
    },
  });
}
