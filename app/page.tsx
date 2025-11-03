'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log(token,"tokentoken");
    
    if (token) {
      router.replace("/dashboard/calendar");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return <div>Loading...</div>;
}
