# AutoSphere V5.1 → V6 universal model fix

The V5.1 issue was that many catalog entries had no embedded model, leaving the viewer without content. V6 replaces that blank-state dependency with an always-visible local Three.js model and keeps remote visuals as optional upgrades.

## V6 behavior
- Every saved owner vehicle produces immediate representative car/bike geometry in the viewer.
- Matching curated community models (for example, Mahindra Thar and Kawasaki Ninja 400) are automatically preferred and labelled as community references.
- Unknown make/model combinations are not replaced by unrelated catalog entries; local representative geometry is used instead.
- An optional configured provider can return eight exterior 360 views or generate a hosted 3D model when explicitly requested.
- Provider requests require a user action and cost confirmation. 360 URLs are cached locally and in Aiven MySQL for five days to avoid repeated paid calls after reloads.
- Provider model state is stored against the owner's vehicle row and every endpoint verifies vehicle ownership.

## Limitations
- Community models may not match a particular trim/model year and their individual licenses/attribution must be followed.
- Procedural geometry is a representative visual, not factory CAD.
- Provider-generated models are render-based reconstructions, not OEM-certified CAD, and provider availability/price/catalog coverage can change.
- External network or browser policy can block community viewer embeds. Use the Local 3D button for the always-available fallback.
