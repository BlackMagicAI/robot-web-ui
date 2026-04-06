import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  channelName: string;
  role: "MASTER" | "VIEWER";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AWS credentials from secrets
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const region = Deno.env.get("AWS_KVS_REGION") || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: "AWS credentials not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { channelName, role }: RequestBody = await req.json();

    if (!channelName || !role || !["MASTER", "VIEWER"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid channelName or role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Describe signaling channel to get ARN
    const describeUrl = `https://kinesisvideo.${region}.amazonaws.com/describeSignalingChannel`;
    const describeRes = await signedFetch(describeUrl, region, accessKeyId, secretAccessKey, "POST", 
      JSON.stringify({ ChannelName: channelName }), "kinesisvideo");
    const describeData = await describeRes.json();
    
    if (!describeRes.ok) {
      return new Response(
        JSON.stringify({ error: `AWS DescribeSignalingChannel failed: ${JSON.stringify(describeData)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const channelARN = describeData.ChannelInfo?.ChannelARN;
    if (!channelARN) {
      return new Response(
        JSON.stringify({ error: "Channel ARN not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get signaling channel endpoints
    const getEndpointUrl = `https://kinesisvideo.${region}.amazonaws.com/getSignalingChannelEndpoint`;
    const getEndpointRes = await signedFetch(getEndpointUrl, region, accessKeyId, secretAccessKey, "POST",
      JSON.stringify({
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
          Protocols: ["WSS", "HTTPS"],
          Role: role,
        },
      }), "kinesisvideo");
    const endpointData = await getEndpointRes.json();

    if (!getEndpointRes.ok) {
      return new Response(
        JSON.stringify({ error: `AWS GetSignalingChannelEndpoint failed: ${JSON.stringify(endpointData)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpointsByProtocol: Record<string, string> = {};
    for (const ep of endpointData.ResourceEndpointList || []) {
      if (ep.Protocol && ep.ResourceEndpoint) {
        endpointsByProtocol[ep.Protocol] = ep.ResourceEndpoint;
      }
    }

    // Step 3: Get ICE server config
    const httpsEndpoint = endpointsByProtocol.HTTPS;
    const getIceUrl = `${httpsEndpoint}/v1/get-ice-server-config`;
    const getIceRes = await signedFetch(getIceUrl, region, accessKeyId, secretAccessKey, "POST",
      JSON.stringify({ ChannelARN: channelARN }), "kinesisvideo");
    const iceData = await getIceRes.json();

    if (!getIceRes.ok) {
      return new Response(
        JSON.stringify({ error: `AWS GetIceServerConfig failed: ${JSON.stringify(iceData)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: `stun:stun.kinesisvideo.${region}.amazonaws.com:443` },
    ];
    for (const ice of iceData.IceServerList || []) {
      iceServers.push({
        urls: ice.Uris || [],
        username: ice.Username,
        credential: ice.Password,
      });
    }

    // Return credentials needed for WebRTC signaling
    // The client still needs credentials for the SignalingClient WebSocket connection
    // We return short-context info (the creds are already server-side, but SignalingClient SDK needs them)
    return new Response(
      JSON.stringify({
        channelARN,
        endpointsByProtocol,
        iceServers,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("kvs-credentials error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── AWS Signature V4 signing ──────────────────────────────────────────

async function signedFetch(
  url: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  method: string,
  body: string,
  service: string
): Promise<Response> {
  const endpoint = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Host: endpoint.host,
    "X-Amz-Date": amzDate,
  };

  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers)
    .sort()
    .map((k) => k.toLowerCase())
    .join(";");

  const canonicalRequest = [
    method,
    endpoint.pathname,
    endpoint.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  headers[
    "Authorization"
  ] = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, { method, headers, body });
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const sig = await hmac(key, data);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${key}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
