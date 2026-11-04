import json, urllib.request, datetime
K="https://api.elections.kalshi.com/trade-api/v2/events/"
def get(u):
    r=urllib.request.Request(u,headers={"User-Agent":"midterms-tracker"})
    return json.load(urllib.request.urlopen(r,timeout=20))
out={"fetched_utc":datetime.datetime.utcnow().isoformat()+"Z","kalshi":{}}
for key,t in {"house":"CONTROLH-2026","senate":"CONTROLS-2026","ca_gov":"GOVPARTYCA-26"}.items():
    try:
        e=get(K+t+"?with_nested_markets=true")
        ms=e.get("event",{}).get("markets") or e.get("markets",[])
        out["kalshi"][key]={"ticker":t,"markets":[{"name":m.get("yes_sub_title"),"last":m.get("last_price_dollars"),"bid":m.get("yes_bid_dollars"),"ask":m.get("yes_ask_dollars"),"status":m.get("status"),"result":m.get("result")} for m in ms]}
    except Exception as ex:
        out["kalshi"][key]={"ticker":t,"error":str(ex)}
json.dump(out,open("data/markets.json","w"),indent=1)
