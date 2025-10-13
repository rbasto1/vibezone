import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export const UnauthorizedModal = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You are not authorized to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
          <SignOutButton redirectUrl="/" />
        </div>
      </div>
    </div>
  );
};
