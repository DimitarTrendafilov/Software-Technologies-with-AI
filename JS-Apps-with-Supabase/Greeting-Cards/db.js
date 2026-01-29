// Database operations for birthday cards

class CardDatabase {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async saveCard(cardData) {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await this.supabase.from("cards").insert([
      {
        user_id: userData.user.id,
        person_name: cardData.personName,
        image_template: cardData.imageTemplate,
        greeting_text: cardData.greetingText,
      },
    ]).select();

    if (error) {
      console.error("Error saving card:", error);
      throw error;
    }

    return data[0];
  }

  async updateCard(cardId, cardData) {
    const { data, error } = await this.supabase
      .from("cards")
      .update({
        person_name: cardData.personName,
        image_template: cardData.imageTemplate,
        greeting_text: cardData.greetingText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .select();

    if (error) {
      console.error("Error updating card:", error);
      throw error;
    }

    return data[0];
  }

  async deleteCard(cardId) {
    const { error } = await this.supabase
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  }

  async getCards() {
    const { data, error } = await this.supabase
      .from("cards")
      .select()
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cards:", error);
      return [];
    }

    return data || [];
  }

  async getCardById(cardId) {
    const { data, error } = await this.supabase
      .from("cards")
      .select()
      .eq("id", cardId)
      .single();

    if (error) {
      console.error("Error fetching card:", error);
      throw error;
    }

    return data;
  }

  async getCardByShareCode(shareCode) {
    const { data, error } = await this.supabase
      .rpc("get_shared_card", {
        share_code_input: shareCode,
      });

    if (error) {
      console.error("Error fetching shared card:", error);
      throw error;
    }

    if (Array.isArray(data)) {
      return data[0] || null;
    }

    return data || null;
  }
}
