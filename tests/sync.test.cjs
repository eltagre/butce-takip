const test=require("node:test");
const assert=require("node:assert/strict");
const {mergeCloudPayload}=require("../sync-merge.js");
const {PGlite}=require("@electric-sql/pglite");
const {readdirSync,readFileSync}=require("node:fs");
const {join}=require("node:path");

test("independent edits survive and deletion wins against a concurrent edit", ()=>{
 const base={accounts:[{id:"delete",name:"a"},{id:"keep",name:"b",opening:0}],categoryBudgets:{Market:50}};
 const local={accounts:[{id:"keep",name:"local",opening:0},{id:"new",name:"new"}],categoryBudgets:{Market:50}};
 const remote={accounts:[{id:"delete",name:"remote"},{id:"keep",name:"b",opening:30}],categoryBudgets:{Market:100}};
 assert.deepEqual(mergeCloudPayload(base,local,remote,true),{
  accounts:[{id:"keep",name:"local",opening:30},{id:"new",name:"new"}],categoryBudgets:{Market:100}
 });
});

test("migration blocks out-of-order writes and resurrection across isolated users", async()=>{
 const db=new PGlite();
 const alice="00000000-0000-4000-8000-000000000001";
 const bob="00000000-0000-4000-8000-000000000002";
 try{
  await db.exec(`
   create role anon;
   create role authenticated;
   create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;
   insert into auth.users values ('${alice}'),('${bob}');
   create table butcem_transactions(user_id uuid references auth.users, id text,
    updated_at timestamptz, value int, primary key(user_id,id));
   create table butcem_settings(user_id uuid primary key, updated_at timestamptz, settings_updated_at timestamptz, value int);
   create table butcem_finance_state(user_id uuid primary key, payload jsonb, updated_at timestamptz);
   create table butcem_wealth_state(like butcem_finance_state including all);
   create table butcem_intelligence_state(like butcem_finance_state including all);
   create policy broad_transactions on butcem_transactions for all to authenticated using (true) with check (true);
   alter table butcem_transactions enable row level security;
   alter table butcem_settings enable row level security;
   create policy own_transactions on butcem_transactions for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
   create policy own_settings on butcem_settings for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
   grant select, insert, update, delete on butcem_transactions, butcem_settings to authenticated;
  `);
  const dir=join(__dirname,"../supabase/migrations");
  const migration=readdirSync(dir).find(name=>name.endsWith("_transaction_tombstones.sql"));
  await db.exec(readFileSync(join(dir,migration),"utf8"));
  const session=id=>db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}'`);
  const upsert=(owner,id,date,value)=>db.query(
   "insert into butcem_transactions values ($1,$2,$3,$4) on conflict(user_id,id) do update set updated_at=excluded.updated_at,value=excluded.value",
   [owner,id,date,value]);
  await session(alice);
  await upsert(alice,"same","2026-11-02",25);
  await upsert(alice,"same","2026-11-01",10);
  assert.equal((await db.query("select value from butcem_transactions")).rows[0].value,25);
  await db.query("insert into butcem_settings values ($1,'2026-11-02','2026-11-02',25)",[alice]);
  await db.exec("update butcem_settings set settings_updated_at='2026-11-01',value=10");
  assert.equal((await db.query("select value from butcem_settings")).rows[0].value,25);
  await assert.rejects(db.query("select butcem_delete_transactions($1,array['same'])",[bob]),/Account changed/);
  await db.query("select butcem_delete_transactions($1,array['same','never-uploaded'])",[alice]);
  await db.query("select butcem_delete_transactions($1,array['same'])",[alice]);
  await upsert(alice,"same","2026-11-03",50);
  await upsert(alice,"never-uploaded","2026-11-03",50);
  assert.equal((await db.query("select * from butcem_transactions")).rows.length,0);
  await session(bob);
  await assert.rejects(upsert(alice,"separate-id","2026-11-03",50),/row-level security/);
  assert.equal((await db.query("select * from butcem_transaction_tombstones")).rows.length,0);
  await assert.rejects(db.query("insert into butcem_transaction_tombstones values ($1,'other')",[alice]),/row-level security/);
  await upsert(bob,"same","2026-11-01",10);
  assert.equal((await db.query("select * from butcem_transactions")).rows.length,1);
  await db.exec("delete from butcem_transactions where id='same'");
  await upsert(bob,"same","2026-11-03",50);
  assert.equal((await db.query("select * from butcem_transactions")).rows.length,0);
 }finally{await db.close()}
});
