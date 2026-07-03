import { provideZonelessChangeDetection } from "@angular/core"
import { bootstrapApplication } from "@angular/platform-browser"

import { App } from "./app.component"

bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
}).catch((error) => console.error(error))
