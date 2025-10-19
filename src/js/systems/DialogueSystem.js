export class DialogueSystem {
    constructor(characters, onDialogueChange) {
        this.characters = characters;
        this.onDialogueChange = onDialogueChange;
        this.currentDialogueIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        
        // Диалоги между персонажами
        this.dialogues = [
            {
                speaker: 'Алекс',
                text: 'Привет, ребята! Как дела?',
                position: 0
            },
            {
                speaker: 'Мария',
                text: 'Привет, Алекс! У меня всё отлично, спасибо!',
                position: 1
            },
            {
                speaker: 'Дмитрий',
                text: 'А у меня сегодня был тяжелый день на работе.',
                position: 2
            },
            {
                speaker: 'Алекс',
                text: 'Понимаю, Дмитрий. Расскажи, что случилось?',
                position: 0
            },
            {
                speaker: 'Дмитрий',
                text: 'Проект срывается, начальство недовольно. Очень стрессово.',
                position: 2
            },
            {
                speaker: 'Мария',
                text: 'Не переживай! Всё наладится. Может, стоит взять выходной?',
                position: 1
            },
            {
                speaker: 'Алекс',
                text: 'Согласен с Марией. Отдых поможет взглянуть на ситуацию свежим взглядом.',
                position: 0
            },
            {
                speaker: 'Дмитрий',
                text: 'Спасибо за поддержку, друзья. Вы правы, нужно отдохнуть.',
                position: 2
            },
            {
                speaker: 'Мария',
                text: 'Отлично! Тогда завтра идем в парк?',
                position: 1
            },
            {
                speaker: 'Алекс',
                text: 'Отличная идея! Я за!',
                position: 0
            },
            {
                speaker: 'Дмитрий',
                text: 'И я! Спасибо, что поддержали меня.',
                position: 2
            }
        ];
    }
    
    start() {
        this.currentDialogueIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        this.playCurrentDialogue();
    }
    
    pause() {
        if (this.isPaused) {
            this.isPaused = false;
            this.playCurrentDialogue();
        } else {
            this.isPaused = true;
        }
    }
    
    next() {
        if (this.currentDialogueIndex < this.dialogues.length - 1) {
            this.currentDialogueIndex++;
            this.playCurrentDialogue();
        } else {
            this.end();
        }
    }
    
    playCurrentDialogue() {
        if (this.isPaused) return;
        
        const dialogue = this.dialogues[this.currentDialogueIndex];
        const character = this.characters[dialogue.position];
        
        // Остановка предыдущего говорящего
        this.characters.forEach(char => {
            char.stopSpeaking();
        });
        
        // Активация текущего говорящего
        character.startSpeaking();
        
        // Уведомление о смене диалога
        this.onDialogueChange(dialogue, character);
    }
    
    end() {
        this.isPlaying = false;
        this.isPaused = false;
        
        // Сброс всех персонажей
        this.characters.forEach(char => {
            char.stopSpeaking();
        });
    }
    
    getCurrentDialogue() {
        return this.dialogues[this.currentDialogueIndex];
    }
    
    getIsPlaying() {
        return this.isPlaying;
    }
    
    getIsPaused() {
        return this.isPaused;
    }
    
    getProgress() {
        return {
            current: this.currentDialogueIndex + 1,
            total: this.dialogues.length
        };
    }
}
