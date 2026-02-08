import express from "express";
import neo4j from "neo4j-driver";

const app = express();
app.use(express.json({ limit: "2mb" }));

const {
  API_KEY,
  NEO4J_URI,
  NEO4J_USER,
  NEO4J_PASSWORD,
  PORT = 10000,
} = process.env;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

app.get("/health", async (_, res) => {
  try {
    await driver.verifyConnectivity();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/run", async (req, res) => {
  if (req.header("X-API-KEY") !== API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { cypher, params = {}, database = "neo4j" } = req.body ?? {};
  if (!cypher) {
    return res.status(400).json({ error: "missing cypher" });
  }

  const session = driver.session({ database });
  try {
    const result = await session.run(cypher, params);
    const records = result.records.map(r => r.toObject());
    const counters = result.summary.counters.updates();
    res.json({ records, counters });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  } finally {
    await session.close();
  }
});

console.log("BODY RECEBIDO:", req.body);


app.listen(PORT, () => console.log("Neo4j middleware running"));
