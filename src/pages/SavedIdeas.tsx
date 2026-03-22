import { useEffect, useState } from "react";

export default function SavedIdeas() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch("/api/my-ideas", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIdeas(data.ideas);
        }
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Saved Startup Ideas</h1>

      {ideas.length === 0 && (
        <p className="text-gray-500">No ideas saved yet.</p>
      )}

      <div className="grid gap-4">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="bg-white p-6 rounded-xl shadow border"
          >
            <h2 className="text-lg font-semibold">{idea.title}</h2>
            <p className="text-gray-600 mt-2">{idea.description}</p>

            <div className="mt-4 text-sm text-gray-500">
              Estimated Cost: {idea.estimated_cost}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}