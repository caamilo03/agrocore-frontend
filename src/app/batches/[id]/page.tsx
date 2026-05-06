import BatchDetailClient from "./BatchDetailClient";

export const runtime = "edge";

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BatchDetailClient batchId={id} />;
}
