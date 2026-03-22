import { useEffect, useState } from "react";

export default function SavedSchemes() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch("/api/my-schemes", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSchemes(data.schemes);
        }
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Tracked Government Schemes</h1>

      {schemes.length === 0 && (
        <p className="text-gray-500">No schemes tracked yet.</p>
      )}

      <div className="grid gap-4">
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className="bg-white p-6 rounded-xl shadow border"
          >
            <h2 className="font-semibold">{scheme.scheme_name}</h2>

            <p className="text-sm text-gray-500 mt-2">
              Saved on: {new Date(scheme.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}