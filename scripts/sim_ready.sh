# Sourced by .github/workflows/simulator.yml. Needs UDID. save_state prints a checksum of the game's save in the web
# view's storage (nothing when there is none); wait_for_save waits up to five minutes for it to differ from the one given.
save_state() {
  data=$(xcrun simctl get_app_container "$UDID" com.aytutuna.mainstreet data)
  for db in $(find "$data/Library" -ipath '*localstorage*' -name '*.sqlite3' 2>/dev/null); do
    sqlite3 "$db" "select hex(value) from ItemTable where key like 'mainstreet.v%' or key = 'mainstreet.chain'" 2>/dev/null
  done | shasum | cut -d ' ' -f 1
}

wait_for_save() {
  end=$((SECONDS + 300))
  while [ $SECONDS -lt $end ]; do
    if [ "$(save_state)" != "$1" ]; then
      return 0
    fi
    sleep 2
  done
  echo "The page never saved: View.ready was not reached"
  return 1
}
