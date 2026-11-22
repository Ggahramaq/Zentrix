# Web Analytics

Enable Web Analytics for the existing Zentrix project in Vercel, then deploy the Git branch and visit the production domain. In the browser Network panel, check that the Vercel analytics script and its page-view request succeed; then check the project's Analytics dashboard. Ad blockers may prevent collection.

Page-view URLs have their query strings and fragments removed before analytics events are sent. This also means campaign parameters such as UTM tags are not reported; referrer reporting remains available. The existing photo experiments continue to process images in the browser and do not send photo data to analytics.

No custom interaction events are configured. Vercel's Hobby plan does not include them; if the project moves to a plan that supports custom events, add a small set of deliberate, non-sensitive events using the official `track` API and review the plan's current limits first.
