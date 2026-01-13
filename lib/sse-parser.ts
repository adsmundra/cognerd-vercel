export class SSEParser {
  private buffer = '';
  private currentEvent: { event?: string; data?: string } = {};

  parse(chunk: string): Array<{ event?: string; data?: string }> {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    const events: Array<{ event?: string; data?: string }> = [];
    
    // Keep the last line if it's incomplete
    this.buffer = lines[lines.length - 1];
    
    // Process all complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        // Empty line signals end of event
        if (this.currentEvent.data) {
          events.push({ ...this.currentEvent });
          this.currentEvent = {};
        }
        continue;
      }
      
      if (line.startsWith('event:')) {
        this.currentEvent.event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        this.currentEvent.data = line.slice(5).trim();
      }
    }
    
    return events;
  }
  
  reset() {
    this.buffer = '';
  }
}