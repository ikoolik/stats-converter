import { BaseProcessor } from "../processors/base";

class TestProcessor extends BaseProcessor {
  protected async processData(): Promise<void> {
    // Minimal implementation for testing
  }
}

describe("BaseProcessor", () => {
  test("should create instance", () => {
    const processor = new TestProcessor();
    expect(processor).toBeInstanceOf(BaseProcessor);
  });
});
