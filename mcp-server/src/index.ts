export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
