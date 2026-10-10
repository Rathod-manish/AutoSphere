package com.VehicleServiceReminder.Controller;

import com.VehicleServiceReminder.AI.AiAssistantService;
import com.VehicleServiceReminder.AI.AssistantChatRequest;
import com.VehicleServiceReminder.AI.AssistantChatResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    private final AiAssistantService aiAssistantService;

    public AssistantController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/chat")
    public AssistantChatResponse chat(Authentication authentication,
                                      @Valid @RequestBody AssistantChatRequest request) {
        return aiAssistantService.chat(Long.valueOf(authentication.getName()), request);
    }
}
