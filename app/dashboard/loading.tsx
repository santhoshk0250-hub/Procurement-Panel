export default function Loading() {
  return (
    <div className="p-4 space-y-6">
      <div className="h-6 w-48 bg-gray-100 rounded" />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
