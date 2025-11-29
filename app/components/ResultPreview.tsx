export default function ResultPreview({ result }: { result: any }) {
  return (
    <pre className="bg-gray-200 p-2">
      <code>{JSON.stringify(result, null, 2)}</code>
    </pre>
  );
}