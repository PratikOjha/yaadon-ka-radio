"use client";

import { useEffect, useState } from "react";

export default function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const format = () => new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());

    setTime(format());
    const id = window.setInterval(() => setTime(format()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!time) return <span>—</span>;
  const [clock, period] = time.split(" ");
  const [hour, minute] = clock.split(":");

  return (
    <>
      {hour}<span className="clock-colon">:</span>{minute} <span className="text-white/45">{period}</span>
    </>
  );
}
